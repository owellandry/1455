import { useState } from "react";

export function usePdfPager(): {
  canGoToNextPage: boolean;
  canGoToPreviousPage: boolean;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  handlePdfLoadSuccess: ({ numPages }: { numPages: number }) => void;
  numPages: number | null;
  pageNumber: number;
  showPager: boolean;
} {
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);

  const handlePdfLoadSuccess = ({ numPages }: { numPages: number }): void => {
    setNumPages(numPages);
    setPageNumber((currentPage) => {
      if (currentPage > numPages) {
        return numPages;
      }
      return currentPage;
    });
  };

  const goToPreviousPage = (): void => {
    setPageNumber((currentPage) => {
      if (currentPage > 1) {
        return currentPage - 1;
      }
      return currentPage;
    });
  };

  const goToNextPage = (): void => {
    setPageNumber((currentPage) => {
      if (numPages != null && currentPage < numPages) {
        return currentPage + 1;
      }
      return currentPage;
    });
  };

  const canGoToPreviousPage = pageNumber > 1;
  const canGoToNextPage = numPages != null && pageNumber < numPages;
  const showPager = numPages != null && numPages > 1;

  return {
    canGoToNextPage,
    canGoToPreviousPage,
    goToNextPage,
    goToPreviousPage,
    handlePdfLoadSuccess,
    numPages,
    pageNumber,
    showPager,
  };
}
